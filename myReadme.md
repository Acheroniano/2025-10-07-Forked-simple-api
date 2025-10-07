# Passos

Fork do repositório original
Criada VPC na AWS
Criado o RDS na AWS

instalação no node.js

instalação do docker
docker build -t ecs-api:latest .

aws configure para usuario awsadmin
aws ecr create-repository --repository-name desafio-kxc-repo --region sa-east-1
aws ecr get-login-password --region sa-east-1 | docker login --username AWS --password-stdin 'idnumber'.dkr.ecr.sa-east-1.amazonaws.com

docker tag ecs-api:latest 'idnumber'.dkr.ecr.sa-east-1.amazonaws.com/desafio-kxc-repo:latest
docker push 'idnumber'.dkr.ecr.sa-east-1.amazonaws.com/desafio-kxc-repo:latest

Configurar o AWS Secrets Manager
Configurar a AWS IAM Role para executar a Tarefa ECS
    Colocar o ARN so secrets manager na Role do IAM

